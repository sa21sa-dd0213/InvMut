import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney fails due to target revert (mutant missing require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple contract that always reverts on receive
    const RevertContract = await ethers.getContractFactory(
      "contract RevertOnReceive { receive() external payable { revert(); } }"
    );
    // Actually deploy a contract with a fallback that reverts
    const RevertFactory = await ethers.getContractFactory(
      "contract RevertOnReceive { fallback() external payable { revert(); } }"
    );
    const revertTarget = await RevertFactory.deploy();
    await revertTarget.waitForDeployment();

    // Fund the wallet with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Attempt sendMoney to the reverting target - in original it reverts, in mutant it silently fails
    await expect(
      instance.connect(owner).sendMoney(await revertTarget.getAddress(), ethers.parseEther("0.5"))
    ).to.be.reverted;

    // Check that wallet balance remained unchanged (mutant would have lost ether)
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});