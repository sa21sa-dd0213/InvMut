import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m04673fd5 test", function () {
  it("should not revert when sendMoney is called with a valid target and sufficient value", async function () {
    const [owner, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it can send Ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Prepare call data for a simple Ether transfer to recipient (empty bytes)
    const callData = "0x";

    // This call should succeed on the original contract and revert on the mutant
    await expect(
      instance.connect(owner).sendMoney(recipient.address, ethers.parseEther("0.5"), callData)
    ).to.not.be.reverted;
  });
});