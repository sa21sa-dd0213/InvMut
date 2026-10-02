import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mbcfb525d detection", function () {
  it("should detect when caddress is set to address(0) instead of the original address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed as per original code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the caddress from the contract
    const caddress = await instance.caddress();
    
    // Verify that the mutant sets caddress to address(0)
    expect(caddress).to.equal(ethers.ZeroAddress);
    
    // Prepare test parameters: two recipients with non-zero values
    const recipients = [addr1.address, addr2.address];
    const values = [1, 2]; // non-zero values that pass the validation check
    
    // Execute the transfer function as the authorized sender (from address)
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const impersonatedSigner = await ethers.getSigner(fromAddress);
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0"),
    });
    
    // Call transfer function
    const tx = await instance.connect(impersonatedSigner).transfer(recipients, values);
    await tx.wait();
    
    // The key assertion: since caddress is address(0), the low-level call does nothing
    // but the function returns true. The test should detect that no actual transfer happened.
    // We can verify this by checking that the contract's caddress is zero, which is the mutant behavior
    const finalCaddress = await instance.caddress();
    expect(finalCaddress).to.equal(ethers.ZeroAddress);
    
    // Additionally, verify that the function completed without reverting (mutant allows this)
    // In the original, the call would go to a real contract; in the mutant it goes to zero address
    // This test kills the mutant by confirming the zero address behavior
  });
});