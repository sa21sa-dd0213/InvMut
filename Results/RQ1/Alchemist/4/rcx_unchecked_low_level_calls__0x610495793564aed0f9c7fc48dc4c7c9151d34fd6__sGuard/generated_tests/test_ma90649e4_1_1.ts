import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sendMoney is called from non-owner address (kills mutant ma90649e4)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // addr1 (non-owner) tries to call sendMoney - should revert with onlyOwner modifier
    await expect(
      instance.connect(addr1).sendMoney(
        addr2.address,
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});