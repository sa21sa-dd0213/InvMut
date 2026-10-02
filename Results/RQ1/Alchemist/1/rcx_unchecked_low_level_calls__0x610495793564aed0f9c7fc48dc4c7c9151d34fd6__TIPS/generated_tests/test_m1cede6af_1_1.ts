import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - revert on failed external call", function () {
  it("should revert when sendMoney is called with a failing target address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use a non-payable contract or address that will fail on receiving ETH
    // We'll deploy a simple contract that rejects ETH
    const Rejector = await ethers.getContractFactory("SimpleWallet");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Fund the wallet with some ETH first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Try to send money to a failing target (send to SimpleWallet which has no receive function but has fallback - actually it does)
    // Better: use an EOA that will reject the call or a contract without receive/fallback
    // Actually, let's use address(0) which will always fail for a call with value
    const failingTarget = ethers.ZeroAddress;
    const value = ethers.parseEther("0.1");
    const data = "0x";

    // This should revert on the original contract because the call will fail
    // On the mutant, it will succeed silently
    await expect(
      instance.connect(owner).sendMoney(failingTarget, value, data)
    ).to.be.reverted;
  });
});