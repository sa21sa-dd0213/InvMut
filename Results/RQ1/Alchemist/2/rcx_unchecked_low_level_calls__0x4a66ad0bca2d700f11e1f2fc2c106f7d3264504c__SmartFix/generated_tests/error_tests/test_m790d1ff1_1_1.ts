import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m790d1ff1 by calling transfer with non-overflowing value and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use hardhat_impersonateAccount to act as the authorized address
    await ethers.provider.send("hardhat_impersonateAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
    ]);

    const authorizedSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the authorized address with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0"),
    });

    // Test with v = [1] which should pass on original but revert on mutant
    const tx = instance.connect(authorizedSigner).transfer(
      [await authorizedSigner.getAddress()],
      [1]
    );

    // On original: tx should succeed
    // On mutant: tx should revert because condition becomes false
    await expect(tx).to.not.be.reverted;

    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [
      "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
    ]);
  });
});