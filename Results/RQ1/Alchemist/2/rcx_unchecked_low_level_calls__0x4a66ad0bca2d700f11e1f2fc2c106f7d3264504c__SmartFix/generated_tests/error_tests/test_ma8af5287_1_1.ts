import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - ma8af5287", function () {
  it("should detect mutant where || is replaced with && by passing v[i]=0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Impersonate the hardcoded from address (works in hardhat network)
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const signer = await ethers.getSigner(fromAddress);

    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });

    // Create test data: _tos array with one address, v array with value 0
    const tos = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [0]; // v[i] = 0 should pass with || but fail with &&

    // This should revert on the mutant because (0 == 0 && (0 * 1e18 / 0 == 1e18)) is false
    // On the original, (0 == 0 || ...) would be true, so it would not revert
    await expect(
      instance.connect(signer).transfer(tos, values)
    ).to.be.reverted;
  });
});