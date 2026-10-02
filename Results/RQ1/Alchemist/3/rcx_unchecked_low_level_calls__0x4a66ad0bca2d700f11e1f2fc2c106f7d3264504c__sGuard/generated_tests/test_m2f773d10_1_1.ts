import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2f773d10", function () {
  it("should revert when called from authorized address due to != mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address using hardhat_setBalance and hardhat_impersonateAccount
    const authorizedAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
        
    // Impersonate the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", [authorizedAddress]);
    await ethers.provider.send("hardhat_setBalance", [authorizedAddress, "0x1000000000000000000"]); // Give some ETH
        
    const authorizedSigner = await ethers.getSigner(authorizedAddress);
        
    // Create test inputs
    const recipients = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [1];
        
    // On the original contract this would succeed, on the mutant it should revert
    await expect(
      instance.connect(authorizedSigner).transfer(recipients, values)
    ).to.be.reverted;
        
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [authorizedAddress]);
  });
});