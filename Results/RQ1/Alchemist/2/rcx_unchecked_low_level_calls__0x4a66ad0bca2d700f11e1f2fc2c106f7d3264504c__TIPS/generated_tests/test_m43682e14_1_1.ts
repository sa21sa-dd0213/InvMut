import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6)", function () {
  it("should succeed when calling transfer with a non-empty array, killing the mutant that uses < 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's hardcoded from address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address to pass the first require
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const fromSigner = await ethers.getSigner(fromAddress);

    // Fund the fromAddress with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1"),
    });

    // Prepare a valid non-empty array of recipients and values
    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1]; // 1 token

    // This call should succeed on original (length > 0) but revert on mutant (length < 0 is always false)
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.not.be.reverted;

    // Stop impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [fromAddress]);
  });
});