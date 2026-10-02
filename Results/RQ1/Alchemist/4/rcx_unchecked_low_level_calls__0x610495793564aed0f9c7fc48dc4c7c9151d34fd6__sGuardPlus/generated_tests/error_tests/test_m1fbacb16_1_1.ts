import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1fbacb16: sendMoney without onlyOwner modifier allows unauthorized call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so sendMoney has balance to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // addr1 is not the owner, so original contract would revert
    // Mutant removes onlyOwner, so this will succeed instead of reverting
    await expect(
      instance.connect(addr1).sendMoney(
        addr2.address,
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});