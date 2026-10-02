import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m3b07594b", function () {
  it("should revert when called from an address with value less than the authorized address (<= mutant detection)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract - EBU has no constructor arguments
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // addr1 has address value less than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Create test arrays with valid data
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("1")]; // 1 token
    
    // Attempt to call transfer from unauthorized address (addr1)
    // On original: should revert because msg.sender != authorized address
    // On mutant: would succeed because addr1 < authorized address (<= passes)
    await expect(
      instance.connect(addr1).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});