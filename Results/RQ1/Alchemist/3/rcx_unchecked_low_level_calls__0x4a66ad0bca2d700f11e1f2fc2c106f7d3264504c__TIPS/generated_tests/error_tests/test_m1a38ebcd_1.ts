import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m1a38ebcd - empty array test", function () {
  it("should revert when _tos array is empty in original but pass in mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU - no constructor arguments needed
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the authorized address from the contract
    const authorizedAddress = await instance.from();
    
    // Impersonate the authorized address to call transfer
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [authorizedAddress],
    });
    const authorizedSigner = await ethers.getSigner(authorizedAddress);

    // Prepare empty arrays
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // Call transfer with empty arrays
    // In the original (require length > 0), this should revert
    // In the mutant (require length >= 0), this should succeed
    const tx = instance.connect(authorizedSigner).transfer(emptyAddresses, emptyValues);
    
    // The mutant will succeed (no revert), so we expect it to NOT revert
    // This test kills the mutant because it expects a revert which won't happen
    await expect(tx).to.be.reverted;
  });
});