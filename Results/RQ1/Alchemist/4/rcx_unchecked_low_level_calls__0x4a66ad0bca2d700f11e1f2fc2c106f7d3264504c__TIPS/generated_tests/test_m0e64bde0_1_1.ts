import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - loop condition change", function () {
  it("should detect mutant that changes i < _tos.length to i > _tos.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments as per contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has hardcoded addresses:
    // from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9 (which is NOT the owner signer)
    // caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923

    // We need to simulate a call from the authorized address (from)
    // Impersonate the from address using hardhat's setBalance and impersonateAccount
    const FROM_ADDRESS = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    await ethers.provider.send("hardhat_setBalance", [
      FROM_ADDRESS,
      "0x1000000000000000000" // 1 ETH
    ]);

    await ethers.provider.send("hardhat_impersonateAccount", [FROM_ADDRESS]);
    const fromSigner = await ethers.getSigner(FROM_ADDRESS);

    // Prepare test data: one recipient with a value
    const recipients = [addr1.address];
    const values = [1]; // 1 token (will be multiplied by 1e18 inside the contract)

    // Test: call transfer and expect it to revert (original behavior)
    // On mutant, it will not revert, so the test fails -> kills mutant
    await expect(
      instance.connect(fromSigner).transfer(recipients, values)
    ).to.be.reverted;

    // Clean up: stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [FROM_ADDRESS]);
  });
});