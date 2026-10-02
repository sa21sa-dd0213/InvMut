import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called with a target that fails, but mutant silently succeeds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that always reverts on receiving ETH
    const ReverterFactory = await ethers.getContractFactory("Reverter");
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // Fund the wallet with some ETH first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send ETH to the reverting contract - should revert in original
    const tx = instance.connect(owner).sendMoney(
      await reverter.getAddress(),
      ethers.parseEther("0.5"),
      "0x"
    );

    // The original contract should revert because the call fails
    // The mutant will NOT revert (due to false condition), so this assertion kills the mutant
    await expect(tx).to.be.reverted;
  });
});

// Helper contract that always reverts on receive
contract Reverter {
  receive() external payable {
    revert("Always reverting");
  }
}