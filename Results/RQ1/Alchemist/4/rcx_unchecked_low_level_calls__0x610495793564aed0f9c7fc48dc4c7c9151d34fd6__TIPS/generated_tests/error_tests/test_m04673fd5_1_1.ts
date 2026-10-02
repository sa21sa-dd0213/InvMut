import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m04673fd5: call sendMoney with a valid payable address and sufficient value, expecting no revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it can send Ether
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // addr1 is a payable address (any signer address can receive Ether)
    const value = ethers.parseEther("0.5");
    const data = "0x";

    // This call should succeed on original (no revert) but fail on mutant (always reverts)
    await expect(
      instance.connect(owner).sendMoney(addr1.address, value, data)
    ).to.not.be.reverted;
  });
});