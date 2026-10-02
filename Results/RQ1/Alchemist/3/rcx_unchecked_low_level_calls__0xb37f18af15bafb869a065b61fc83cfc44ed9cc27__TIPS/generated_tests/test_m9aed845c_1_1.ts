import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m9aed845c - sendMoney revert removal", function () {
  it("should revert when sendMoney target call fails (mutant silently ignores failure)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it has balance to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Use a non-payable contract or address that will reject ETH
    // Deploy a simple contract that does not have receive/fallback
    const Rejector = await ethers.getContractFactory("SimpleWallet");
    const rejectorInstance = await Rejector.deploy();
    await rejectorInstance.waitForDeployment();

    // Attempt to send ETH to a contract that rejects ETH (no receive/fallback)
    // The original contract should revert, the mutant should not
    await expect(
      instance.connect(owner).sendMoney(
        await rejectorInstance.getAddress(),
        ethers.parseEther("0.5")
      )
    ).to.be.reverted;
  });
});