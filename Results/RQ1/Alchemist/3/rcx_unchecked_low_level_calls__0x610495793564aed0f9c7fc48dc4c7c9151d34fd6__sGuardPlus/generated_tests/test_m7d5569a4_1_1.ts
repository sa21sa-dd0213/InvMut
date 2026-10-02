import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called with a failing recipient address (mutant removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Deploy a simple contract that rejects ETH (no receive/fallback)
    const Rejector = await ethers.getContractFactory(
      "contract Rejector { fallback() external payable { revert(); } }"
    );
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();

    // Attempt to send ETH to the rejector - should revert due to require check
    await expect(
      instance.connect(owner).sendMoney(
        await rejector.getAddress(),
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});