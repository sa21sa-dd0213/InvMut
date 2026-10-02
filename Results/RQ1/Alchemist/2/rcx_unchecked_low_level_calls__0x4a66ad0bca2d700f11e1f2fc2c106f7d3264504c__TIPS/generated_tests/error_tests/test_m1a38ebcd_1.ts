import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m1a38ebcd test", function () {
  it("should revert when _tos array is empty on original but succeed on mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract - EBU has no constructor arguments
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the authorized address from the contract
    const authorizedAddress = await instance.from();
    
    // We need to use the authorized address as msg.sender
    // Since the contract's from address is hardcoded, we need to impersonate it
    // or use a signer with that address. In testing, we'll use the owner as the caller
    // but the contract checks msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    
    // For the test, we'll check the require condition: if we call from wrong address it will revert
    // The mutant changes require(_tos.length > 0) to require(_tos.length >= 0)
    // So we test with empty array from authorized address
    
    // Impersonate the authorized address
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [authorizedAddress],
    });
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Send ether to the impersonated account to pay gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0"),
    });
    
    // Call transfer with empty _tos array and empty v array
    const tx = instance.connect(authorizedSigner).transfer([], []);
    
    // On the original contract, this should revert because _tos.length > 0 fails
    // On the mutant, this should succeed because _tos.length >= 0 passes
    await expect(tx).to.be.reverted;
  });
});