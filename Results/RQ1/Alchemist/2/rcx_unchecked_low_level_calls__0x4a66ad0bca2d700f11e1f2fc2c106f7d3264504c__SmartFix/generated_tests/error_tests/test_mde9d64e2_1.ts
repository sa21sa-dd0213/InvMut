import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mde9d64e2 by calling transfer with v[i]=1 which passes original but fails mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Contract has no constructor, so deploy without arguments
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that msg.sender matches the hardcoded 'from' address
    // The from address in contract is: 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Impersonate the 'from' address using hardhat_setBalance and hardhat_impersonateAccount
    await ethers.provider.send("hardhat_setBalance", [fromAddress, "0x1000000000000000000"]);
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const fromSigner = await ethers.getSigner(fromAddress);

    // Connect the contract instance to the impersonated signer
    const instanceFrom = instance.connect(fromSigner);

    // Prepare test inputs: single recipient and v[i] = 1
    const tos = [addr1.address];
    const v = [1]; // v[i] = 1

    // This transaction should revert on the mutant because:
    // (1 * 1e18 - 1) = 999999999999999999 != 1e18
    // But should succeed on original where (1 * 1e18) / 1 = 1e18
    await expect(
      instanceFrom.transfer(tos, v)
    ).to.be.reverted;
  });
});