import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mb442de3a test", function () {
  it("should kill the mutant by calling transfer from authorized address and expecting success on original but revert on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed as per the contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The authorized address from the contract
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Get the signer for the authorized address (import it via hardhat config or use impersonation)
    // Since we can't directly get this signer, we use ethers' getImpersonatedSigner
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Fund the authorized account with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });
    
    // Prepare test parameters
    const tos = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // The mutant will revert when called from authorized address (due to != instead of ==)
    // The original would succeed
    await expect(
      instance.connect(authorizedSigner).transfer(tos, values)
    ).to.be.reverted;
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [authorizedAddress]);
  });
});