import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called with a target that rejects Ether (detects mutant that removes revert check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that rejects incoming Ether
    const Rejector = await ethers.getContractFactory("Rejector");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Fund the SimpleWallet so it can attempt the transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send money to the rejecting contract - should revert on original
    await expect(
      instance.connect(owner).sendMoney(await rejector.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});