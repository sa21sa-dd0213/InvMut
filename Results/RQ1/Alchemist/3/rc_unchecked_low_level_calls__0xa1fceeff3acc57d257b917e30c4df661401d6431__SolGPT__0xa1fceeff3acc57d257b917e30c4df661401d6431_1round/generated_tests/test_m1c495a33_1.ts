import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when contract_address is the contract itself (original behavior), but mutant allows it - test to kill mutant m1c495a33", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (constructor takes no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Prepare test data: one recipient and one value
    const recipients = [addr1.address];
    const values = [100];
    
    // The original contract should revert when contract_address == address(this)
    // because the modifier requires addr != address(this)
    // The mutant changes this to require addr == address(this), so it would succeed
    // We expect the original to revert, thus detecting the mutant if it doesn't revert
    await expect(
      instance.connect(owner).transfer(contractAddress, recipients, values)
    ).to.be.reverted;
  });
});