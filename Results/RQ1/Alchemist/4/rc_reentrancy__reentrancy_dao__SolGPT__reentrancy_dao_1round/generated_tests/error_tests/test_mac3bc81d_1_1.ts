import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - mac3bc81d", function () {
  it("should detect mutant by verifying withdrawal succeeds when user has credit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit from addr1
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check initial balance
    expect(await instance.credit(addr1.address)).to.equal(depositAmount);

    // Get initial ether balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Withdraw all
    const tx = await instance.connect(addr1).withdrawAll();
    const receipt = await tx.wait();

    // Calculate gas cost
    const gasCost = receipt.gasUsed * receipt.gasPrice;

    // Verify credit is zero after withdrawal
    expect(await instance.credit(addr1.address)).to.equal(0);

    // Verify addr1 received the ether (balance increased by deposit minus gas)
    const finalBalance = await ethers.provider.getBalance(addr1.address);
    expect(finalBalance).to.equal(initialBalance + depositAmount - gasCost);

    // Verify contract balance is zero
    expect(await ethers.provider.getBalance(instance.target)).to.equal(0);
  });
});