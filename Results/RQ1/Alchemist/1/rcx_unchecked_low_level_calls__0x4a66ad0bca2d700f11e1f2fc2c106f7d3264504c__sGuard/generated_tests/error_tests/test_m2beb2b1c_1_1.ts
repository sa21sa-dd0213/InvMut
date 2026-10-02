import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2beb2b1c", function () {
  it("should revert when called from an address less than the authorized address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create an address that is numerically less than the authorized address
    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use a random signer that is not the owner and has a lower address
    const unauthorizedSigner = addr1;
    
    // Prepare valid parameters for transfer
    const tos = [addr2.address];
    const values = [1];
    
    // Attempt to call transfer from an unauthorized address with lower address value
    await expect(
      instance.connect(unauthorizedSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});