import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mc7f4aaf6 by calling Put with positive ether value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Call Put with a positive ether value from addr1
    const depositAmount = ethers.parseEther("1.0");
    
    // This should succeed on the original (balance increases) 
    // but revert on the mutant (require condition fails when msg.value > 0)
    await expect(
      instance.connect(addr1).Put(0, { value: depositAmount })
    ).to.not.be.reverted;
    
    // Verify the balance actually increased (to ensure we're testing the right behavior)
    const holder = await instance.Acc(await addr1.getAddress());
    expect(holder.balance).to.equal(depositAmount);
  });
});