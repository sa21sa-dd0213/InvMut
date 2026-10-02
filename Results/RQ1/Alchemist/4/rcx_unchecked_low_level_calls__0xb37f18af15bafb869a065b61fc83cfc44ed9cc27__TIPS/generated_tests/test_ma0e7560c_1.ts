import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney to a failing contract - mutant kills revert check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that reverts on receiving ETH
    const FailingReceiver = await ethers.getContractFactory("contracts/FailingReceiver.sol:FailingReceiver");
    const failingReceiver = await FailingReceiver.deploy();
    await failingReceiver.waitForDeployment();

    // Fund the SimpleWallet with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // This should revert in the original (call fails, !_s is true)
    // In the mutant, false is used, so no revert occurs
    await expect(
      instance.connect(owner).sendMoney(await failingReceiver.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});