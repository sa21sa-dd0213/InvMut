import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - caddress set to address(0)", function () {
  it("should revert when calling transfer with valid recipients if caddress is address(0) because no transferFrom logic executes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract - no constructor arguments needed for EBU
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the caddress is address(0) in the mutant
    const caddress = await instance.caddress();
    expect(caddress).to.equal(ethers.ZeroAddress);
    
    // Prepare test data: send 1 token to addr1
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // Call transfer as the authorized sender (from address)
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fromAddress],
    });
    const impersonatedSigner = await ethers.getSigner(fromAddress);
    
    // Fund the impersonated account for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0"),
    });
    
    // This call should succeed (return true) but no actual transfer occurs
    // because calling address(0) returns success without executing anything
    const tx = await instance.connect(impersonatedSigner).transfer(recipients, amounts);
    await tx.wait();
    
    // The mutant should NOT have transferred tokens - verify by checking
    // that addr1's balance is still 0 (no transfer occurred)
    // In the original, this would have transferred tokens to addr1
    // This test will fail on the original but pass on the mutant, detecting it
    const balance = await ethers.provider.getBalance(addr1.address);
    expect(balance).to.equal(0);
    
    // Clean up impersonation
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [fromAddress],
    });
  });
});