import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m2f925acf by verifying that burn reverts when owner has insufficient balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const tokenName = "TestToken";
    const tokenSymbol = "TT";

    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, tokenName, tokenSymbol);
    await instance.waitForDeployment();

    // Owner has full initial supply (1000 tokens), try to burn more than that
    const burnAmount = ethers.parseEther("2000");

    // The original contract reverts with a require message "balanceOf[msg.sender] >= _value"
    // The mutant lacks this require check, so it would either succeed or revert with different error
    await expect(
      instance.connect(owner).burn(burnAmount)
    ).to.be.reverted;
  });
});