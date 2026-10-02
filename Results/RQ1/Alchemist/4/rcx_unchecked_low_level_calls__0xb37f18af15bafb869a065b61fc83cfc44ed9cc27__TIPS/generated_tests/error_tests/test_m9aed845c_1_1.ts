import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney fails on original, but succeed on mutant that removed revert()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that rejects incoming Ether
    const RejectorFactory = await ethers.getContractFactory(
      "contracts/Rejector.sol:Rejector"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the wallet with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Try to send money to the rejecting contract - should revert on original
    // On the mutant (where revert() is removed), this will silently succeed
    await expect(
      instance.connect(owner).sendMoney(await rejector.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});