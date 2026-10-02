import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kill mutant m39231ab2)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use a valid ERC20 token address for caddress (any address will do for this test)
    const tokenAddress = addr1.address;
    // Empty array of recipients
    const emptyRecipients: string[] = [];
    const amount = ethers.parseEther("1");

    // The original contract reverts with require(_tos.length > 0) when array is empty
    // The mutant with >= 0 would not revert, which is incorrect behavior
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyRecipients, amount)
    ).to.be.reverted;
  });
});