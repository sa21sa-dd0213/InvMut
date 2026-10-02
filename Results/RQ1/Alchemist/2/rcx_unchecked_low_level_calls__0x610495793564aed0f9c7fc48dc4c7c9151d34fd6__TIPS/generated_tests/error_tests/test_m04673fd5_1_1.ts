import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - m04673fd5", function () {
  it("should succeed when sendMoney to valid recipient with enough balance, but mutant always reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Prepare a successful call: send 0.5 ether to addr1 with empty data
    const targetAddress = await addr1.getAddress();
    const value = ethers.parseEther("0.5");
    const emptyData = "0x";

    // In original contract, this call should succeed (addr1 receives ether, no revert)
    // In mutant, the function always reverts due to if(true) condition
    await expect(
      instance.connect(owner).sendMoney(targetAddress, value, emptyData)
    ).to.not.be.reverted;

    // Verify the recipient actually received the ether
    const recipientBalance = await ethers.provider.getBalance(targetAddress);
    expect(recipientBalance).to.equal(ethers.parseEther("0.5"));
  });
});