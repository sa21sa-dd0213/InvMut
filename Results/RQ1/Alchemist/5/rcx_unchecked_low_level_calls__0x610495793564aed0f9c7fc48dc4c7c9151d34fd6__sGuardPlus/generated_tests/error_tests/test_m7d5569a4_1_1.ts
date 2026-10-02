import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called with a target that rejects ETH (kills mutant that removes require(sent_result))", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy SimpleWallet (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple contract that always reverts on receive
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { fallback() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the wallet with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send ETH to the rejecting contract - should revert in original
    await expect(
      instance.connect(owner).sendMoney(
        await rejector.getAddress(),
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});