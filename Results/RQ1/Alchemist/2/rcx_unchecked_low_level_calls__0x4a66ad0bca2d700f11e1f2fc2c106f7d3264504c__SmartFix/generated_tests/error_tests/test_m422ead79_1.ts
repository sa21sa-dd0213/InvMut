import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m422ead79 by passing v[i] = 0 which passes on original but reverts on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is hardcoded to 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address to call transfer
    await ethers.provider.send("hardhat_impersonateAccount", ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]);
    const signer = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the impersonated account to pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // Test case: v[i] = 0 should pass on original (since v[i] == 0 is allowed)
    // but fail on mutant (since v[i] != 0 is false for zero and the second condition also fails for zero)
    const tos = [addr1.address];
    const values = [0];

    // This should revert on the mutant because v[i] = 0 fails both conditions in the mutated require
    await expect(
      instance.connect(signer).transfer(tos, values)
    ).to.be.reverted;
  });
});