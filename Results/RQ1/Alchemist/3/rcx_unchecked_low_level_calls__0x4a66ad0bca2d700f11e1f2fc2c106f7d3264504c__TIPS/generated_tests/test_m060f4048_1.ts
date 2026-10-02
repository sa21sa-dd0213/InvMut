import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m060f4048", function () {
  it("should kill the mutant by detecting exponentiation instead of multiplication", async function () {
    // Deploy the contract (no constructor arguments needed as per original EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const [owner, addr1] = await ethers.getSigners();
    
    // The contract's from address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Impersonate the from address to call transfer (since require(msg.sender == fromAddress))
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fromAddress],
    });
    const signer = await ethers.getSigner(fromAddress);
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0"),
    });

    // Prepare test data: use v[i] = 2, which will expose the difference
    // Original: 2 * 1e18 = 2e18
    // Mutant:   2 ** 1e18 = astronomically large (will overflow or revert)
    const recipients = [addr1.address];
    const values = [2]; // 2 tokens
    
    // Attach the contract instance to the impersonated signer
    const contractWithSigner = instance.connect(signer);
    
    // The mutant will either:
    // 1. Revert due to arithmetic overflow (exponentiation produces huge number)
    // 2. If it somehow doesn't revert, the transfer amount will be wrong
    
    // We expect the call to revert because 2 ** 1e18 far exceeds uint256 max
    await expect(
      contractWithSigner.transfer(recipients, values)
    ).to.be.reverted;
    
    // Clean up impersonation
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [fromAddress],
    });
  });
});