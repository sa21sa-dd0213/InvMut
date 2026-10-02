import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m4bb153a4", function () {
  it("should revert when calling transfer with an array of length 1 due to off-by-one loop", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract requires msg.sender to be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address or use a signer with that address
    // Since we cannot easily get a signer with that exact address in tests,
    // we will use ethers's impersonate functionality
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"],
    });
    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the impersonated account with ETH to pay gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0"),
    });

    const tos = ["0x0000000000000000000000000000000000000001"];
    const v = [1];

    // The original contract would succeed with one element
    // The mutant with <= would try to access _tos[1] and v[1] (out of bounds) and revert
    await expect(
      instance.connect(fromSigner).transfer(tos, v)
    ).to.be.reverted;
  });
});