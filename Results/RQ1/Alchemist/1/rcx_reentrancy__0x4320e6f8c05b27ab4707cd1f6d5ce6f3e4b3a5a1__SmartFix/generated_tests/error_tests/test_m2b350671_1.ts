import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test - m2b350671", function () {
  it("should detect mutant by reverting on positive deposit (balance - msg.value >= balance is always false)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ACCURAL_DEPOSIT - no constructor arguments based on provided contract
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1");
    
    // Attempt to deposit from addr1 - should succeed on original, revert on mutant
    await expect(
      instance.connect(addr1).Deposit({ value: depositAmount })
    ).to.be.reverted;
  });
  
  it("should detect mutant via receive() fallback with positive value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("1");
    
    // Send ether directly to contract - triggers receive() which calls Deposit()
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: depositAmount
      })
    ).to.be.reverted;
  });
  
  it("should verify zero-value deposit passes even on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Zero value should pass on both original and mutant (0 - 0 >= 0 is true)
    await expect(
      instance.connect(addr1).Deposit({ value: 0 })
    ).to.not.be.reverted;
    
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(0);
  });
});