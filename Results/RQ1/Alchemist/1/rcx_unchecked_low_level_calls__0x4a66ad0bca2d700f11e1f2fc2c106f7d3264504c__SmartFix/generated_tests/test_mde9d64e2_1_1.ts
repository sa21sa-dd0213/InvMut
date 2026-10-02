import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mde9d64e2 test", function () {
  it("should kill the mutant by passing v[i]=2 which reverts in mutant but passes in original", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Impersonate the hardcoded from address
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });

    const impersonatedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the impersonated account so it can pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0"),
    });

    // Prepare test data - v[i] = 2 will trigger the mutant's arithmetic bug
    const tos = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [2];

    // In the original: (2 * 1e18) / 2 == 1e18 -> true
    // In the mutant: (2 * 1e18) - 2 == 1e18 -> false (revert)
    await expect(
      instance.connect(impersonatedSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});