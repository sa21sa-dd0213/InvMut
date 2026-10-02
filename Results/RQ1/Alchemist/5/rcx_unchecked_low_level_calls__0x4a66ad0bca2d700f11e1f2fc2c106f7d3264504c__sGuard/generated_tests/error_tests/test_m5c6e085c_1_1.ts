import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5c6e085c test", function () {
  it("should revert when _tos array is empty in original, but pass in mutant (>= 0)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The transfer function requires msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    await ethers.provider.send("hardhat_impersonateAccount", [fromAddress]);
    const signer = await ethers.getSigner(fromAddress);

    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });

    // Call transfer with empty _tos array and any v array (must match length 0)
    const emptyTos: string[] = [];
    const emptyV: number[] = [];

    // In the original contract this should revert because _tos.length > 0 fails
    // In the mutant (>= 0) this should pass
    // We expect a revert for the original contract
    await expect(
      instance.connect(signer).transfer(emptyTos, emptyV)
    ).to.be.reverted;
  });
});