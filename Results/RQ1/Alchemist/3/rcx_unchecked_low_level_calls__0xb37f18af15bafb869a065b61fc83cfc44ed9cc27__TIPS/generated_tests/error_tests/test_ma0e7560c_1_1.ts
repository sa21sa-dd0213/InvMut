import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called with a target that rejects Ether, but mutant with false instead of !_s will not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that rejects all incoming Ether
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    const valueToSend = ethers.parseEther("1");

    // On the original contract, this should revert because the call fails.
    // On the mutant (where false replaces !_s), the revert will not happen and the transaction will succeed.
    await expect(
      instance.connect(owner).sendMoney(await rejector.getAddress(), valueToSend)
    ).to.be.reverted;
  });
});