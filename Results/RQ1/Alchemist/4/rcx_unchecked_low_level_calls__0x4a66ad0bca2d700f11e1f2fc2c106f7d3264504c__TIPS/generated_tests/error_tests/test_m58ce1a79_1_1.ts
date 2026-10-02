import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m58ce1a79", function () {
  it("should revert when _tos array is empty (original behavior), but mutant passes without revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's 'from' address is hardcoded to 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address to pass the msg.sender check
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [fromAddress],
    });
    const fromSigner = await ethers.getSigner(fromAddress);

    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0"),
    });

    // Test case: empty _tos array
    const emptyTos: string[] = [];
    const v: number[] = [];

    // The original contract reverts on empty array, the mutant does not
    await expect(
      instance.connect(fromSigner).transfer(emptyTos, v)
    ).to.be.reverted;
  });
});