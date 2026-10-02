import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m646bbd22", function () {
  it("should detect mutant by reverting when external call succeeds", async function () {
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // The authorized sender is the hardcoded address 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address or use a signer with that private key
    // For testing, we'll use hardhat's impersonate functionality
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
    
    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: authorizedAddress,
      value: ethers.parseEther("1.0")
    });

    // The caddress is hardcoded as 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // We need to deploy a simple contract at that address that will successfully respond to transferFrom
    // For testing, we can set up a mock by deploying a minimal contract
    const mockFactory = await ethers.getContractFactory("contracts/test/MockToken.sol:MockToken");
    const mockToken = await mockFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Set the contract address to the hardcoded caddress using hardhat_setStorageAt
    // This is a workaround since we cannot change the hardcoded address in the contract
    // Alternatively, we can use a different approach - we'll deploy the mock and then
    // use hardhat_setCode to set the code at the hardcoded address
    await ethers.provider.send("hardhat_setCode", [
      "0x1f844685f7Bf86eFcc0e74D8642c54A257111923",
      await ethers.provider.getCode(mockToken.target)
    ]);

    // Prepare valid transfer parameters
    const tos = [addr1.address];
    const values = [1]; // 1 token
    
    // On the original contract, this should succeed (the external call returns true)
    // On the mutant, it will revert because the condition is always true
    await expect(
      instance.connect(authorizedSigner).transfer(tos, values)
    ).to.not.be.reverted;

    // Cleanup: stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [authorizedAddress]);
  });
});