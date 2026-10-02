import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - mbfd38045", function () {
  it("should kill the mutant by verifying withdrawal fails when condition is inverted from > to <", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check balance before withdrawal
    const creditBefore = await instance.credit(addr1.address);
    expect(creditBefore).to.equal(depositAmount);

    // Attempt withdrawal - on mutant, condition oCredit < 0 is always false (uint can't be negative),
    // so the withdrawal logic is skipped entirely. On original, it succeeds.
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // After withdrawal on original: credit[addr1] = 0 and addr1 receives funds.
    // On mutant: credit remains unchanged (still depositAmount) and no transfer happens.
    const creditAfter = await instance.credit(addr1.address);
    expect(creditAfter).to.equal(depositAmount); // Mutant leaves credit untouched
  });
});