import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mbfd38045", function () {
  it("should detect mutant that changes > to < in withdrawAll condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check credit balance before withdrawal
    const creditBefore = await instance.credit(addr1.address);
    expect(creditBefore).to.equal(depositAmount);

    // Attempt withdrawal - should succeed in original, fail in mutant
    const tx = instance.connect(addr1).withdrawAll();
    
    // In the original contract, this succeeds and transfers ether
    // In the mutant (with < instead of >), the condition is never true,
    // so no withdrawal happens and no ether is transferred
    await expect(tx).to.changeEtherBalances(
      [addr1, instance],
      [depositAmount, -depositAmount]
    );
  });
});