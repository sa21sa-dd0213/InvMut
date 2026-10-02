import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney sends to a contract that rejects ether, detecting mutant that removed revert()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that rejects ether (no receive/fallback)
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    const sendValue = ethers.parseEther("1.0");
    
    // Fund the wallet first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: sendValue
    });

    // This should revert on original, but pass on mutant (killing it)
    await expect(
      instance.connect(owner).sendMoney(await rejector.getAddress(), sendValue)
    ).to.be.reverted;
  });
});