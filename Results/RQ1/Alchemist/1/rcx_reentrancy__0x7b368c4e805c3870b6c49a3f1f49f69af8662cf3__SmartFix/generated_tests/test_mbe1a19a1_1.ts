import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mbe1a19a1 test", function () {
  it("should kill mutant by sending non-zero Ether to Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Call Put with non-zero value - should revert in mutant but pass in original
    const tx = instance.connect(addr1).Put(0, { value: ethers.parseEther("1.0") });
    
    // The mutant will revert because (balance + msg.value) <= balance is false for positive value
    // The original will succeed
    await expect(tx).to.not.be.reverted;
  });
});