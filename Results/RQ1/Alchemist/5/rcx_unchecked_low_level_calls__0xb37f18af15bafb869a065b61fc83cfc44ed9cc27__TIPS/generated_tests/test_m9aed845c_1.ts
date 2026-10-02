import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney to a failing address, but mutant does not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that has no receive/fallback function to force a failed call
    const FailFactory = await ethers.getContractFactory("contracts/FailReceiver.sol:FailReceiver");
    const failReceiver = await FailFactory.deploy();
    await failReceiver.waitForDeployment();

    // Send some ETH to the wallet first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send ETH to the failReceiver contract (will fail because no receive/fallback)
    // The original should revert, the mutant should not
    if (await instance.depositsCount() === 0n) {
      // Do nothing, just proceed
    }

    await expect(
      instance.connect(owner).sendMoney(await failReceiver.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});