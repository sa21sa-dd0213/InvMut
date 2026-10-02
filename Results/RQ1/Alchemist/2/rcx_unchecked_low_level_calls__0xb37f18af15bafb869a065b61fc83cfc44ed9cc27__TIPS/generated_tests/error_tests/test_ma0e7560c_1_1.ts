import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - sendMoney revert on failed call", function () {
  it("should revert when sendMoney is called with a failing target, but mutant will not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that rejects incoming ether
    const Rejector = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Fund the SimpleWallet with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send ether to the rejector contract - should revert in original
    await expect(
      instance.connect(owner).sendMoney(await rejector.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;

    // In the mutant, the call will succeed silently, so we also verify that the balance of rejector didn't change
    const rejectorBalanceAfter = await ethers.provider.getBalance(await rejector.getAddress());
    expect(rejectorBalanceAfter).to.equal(0);
  });
});