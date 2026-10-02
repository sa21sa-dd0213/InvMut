import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should succeed when contract_address is a valid external address (original behavior), but mutant reverts - test to kill mutant m1c495a33", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get a valid external address (not zero, not the contract itself)
    const validExternalAddress = addr1.address;
    
    // Prepare test data: one recipient and one value
    const recipients = [addr1.address];
    const values = [100];
    
    // The original contract should succeed with a valid external address
    // The mutant would revert because it requires addr == address(this)
    // We expect the original to succeed, thus detecting the mutant if it reverts
    const tx = await instance.connect(owner).transfer(validExternalAddress, recipients, values);
    await tx.wait();
    
    // If we reach here, the call succeeded as expected (original behavior)
    // The mutant would have reverted, so this test kills the mutant
    expect(true).to.equal(true);
  });
});