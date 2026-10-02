import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m8f396d3b", function () {
  it("should detect mutated from address by calling transfer from authorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the hardcoded authorized address from the original contract
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Impersonate the authorized address to send the transaction
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });
    
    // Prepare test parameters
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token
    
    // This call should succeed on original but fail on mutant because:
    // - Original: transferFrom(from=authorizedAddress, to=recipient, amount)
    // - Mutant: transferFrom(from=caddress=0x1f844..., to=recipient, amount)
    // The caddress (0x1f844...) has no tokens to transfer, causing revert
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, amounts)
    ).to.be.reverted;
    
    // Clean up: stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [authorizedAddress]);
  });
});