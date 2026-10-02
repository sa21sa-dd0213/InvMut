import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - stateVariable replacement", function () {
  it("should detect mutant where from address is changed to address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // In the original, from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // In the mutant, from = address(this) = contract address
    // Check that from address is NOT the contract address (would indicate mutant)
    const fromAddress = await instance.from();
    expect(fromAddress).to.not.equal(contractAddress, "Mutant detected: from address is address(this) instead of fixed address");
    
    // Verify the from address matches the expected fixed address
    const expectedFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    expect(fromAddress).to.equal(expectedFrom, "Original contract should have the correct fixed from address");
    
    // Now test the transfer function behavior
    // Get the original fixed address as a signer to call transfer
    await network.provider.send("hardhat_impersonateAccount", [expectedFrom]);
    const fromSigner = await ethers.getSigner(expectedFrom);
    
    // Send some ETH to the impersonated account to pay for gas
    await owner.sendTransaction({
      to: expectedFrom,
      value: ethers.parseEther("1.0")
    });
    
    // Prepare test parameters
    const recipients = [addr1.address];
    const values = [1]; // 1 token
    
    // This call should succeed in the original (from address is correct)
    // In the mutant, the call might fail because contract doesn't have tokens/approvals
    try {
      const tx = await instance.connect(fromSigner).transfer(recipients, values);
      await tx.wait();
      
      // If we get here in the original, the transferFrom call was made with correct from address
      // In the mutant, it would have used contract address as from, which would likely fail
      // So reaching here indicates original behavior
    } catch (error: any) {
      // If it reverts, check if it's because of the mutant
      // In the mutant, the transferFrom call uses contract address as from
      // which would cause a revert since contract doesn't have the tokens
      expect(error.message).to.include("mutant");
    }
    
    // Stop impersonating
    await network.provider.send("hardhat_stopImpersonatingAccount", [expectedFrom]);
  });
});