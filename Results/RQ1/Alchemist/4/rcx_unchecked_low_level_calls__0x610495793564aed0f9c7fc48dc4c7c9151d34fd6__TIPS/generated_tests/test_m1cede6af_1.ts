import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m1cede6af test", function () {
  it("should revert when sendMoney is called with a target that fails, but mutant allows it to succeed silently", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Create a contract that will revert on receive
    const RevertingReceiver = await ethers.getContractFactory("contract RevertingReceiver { receive() external payable { revert(); } }");
    const revertingReceiver = await RevertingReceiver.deploy();
    await revertingReceiver.waitForDeployment();

    // Attempt to send money to the reverting receiver - should revert in original, but mutant will succeed
    await expect(
      instance.connect(owner).sendMoney(
        await revertingReceiver.getAddress(),
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});