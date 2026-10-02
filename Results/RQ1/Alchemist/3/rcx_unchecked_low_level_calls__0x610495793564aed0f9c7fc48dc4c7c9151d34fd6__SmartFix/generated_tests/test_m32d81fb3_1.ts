import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert sendMoney when called by non-owner (mutant removes onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so sendMoney has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call sendMoney from non-owner address - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).sendMoney(
        addr1.address,
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});