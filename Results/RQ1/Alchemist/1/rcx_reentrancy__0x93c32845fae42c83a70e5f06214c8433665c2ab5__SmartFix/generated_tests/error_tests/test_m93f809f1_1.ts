import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m93f809f1 - Collect condition replaced with false", function () {
  it("should revert when Collect is called with valid parameters because the condition is always false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Put funds for addr1 to create an account with balance
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("2") });
    
    // Verify the balance was recorded
    const acc = await instance.Acc(addr1.address);
    expect(acc.balance).to.equal(ethers.parseEther("2"));
    
    // Now try to collect - should revert because condition is always false
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});