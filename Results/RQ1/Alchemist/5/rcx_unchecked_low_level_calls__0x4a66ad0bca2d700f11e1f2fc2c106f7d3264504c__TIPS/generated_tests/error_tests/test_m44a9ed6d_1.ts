import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m44a9ed6d", function () {
  it("should revert when internal call fails, but mutant silently continues", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has hardcoded addresses:
    // from = 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // caddress = 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // Only the owner (0x9797...) can call transfer

    // We need to simulate a call that will fail - use an invalid receiver address
    // The internal call does: caddress.call(abi.encodeWithSelector(id, from, _tos[i], v[i] * 1e18))
    // If _tos[i] is an address that causes the token transfer to fail (e.g., zero address), the call returns false

    const invalidReceiver = "0x0000000000000000000000000000000000000000";
    const amounts = [1]; // 1 token (will be multiplied by 1e18)

    // Impersonate the owner address to call transfer
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
    const ownerSigner = await ethers.getSigner(
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    );

    // Fund the owner with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Attempt the transfer - the original contract would revert because the call to
    // caddress (which is a random address with no code) with transferFrom selector will fail.
    // The mutant removes the revert, so it will return true instead.
    await expect(
      instance.connect(ownerSigner).transfer([invalidReceiver], amounts)
    ).to.be.reverted;

    // Clean up impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"
    ]);
  });
});