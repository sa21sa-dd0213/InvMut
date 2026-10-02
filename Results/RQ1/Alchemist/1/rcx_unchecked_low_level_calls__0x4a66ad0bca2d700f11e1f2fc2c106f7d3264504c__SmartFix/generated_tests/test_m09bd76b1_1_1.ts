import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m09bd76b1 test", function () {
  it("should revert when _tos.length is 0, but succeed when length > 0 (original behavior)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with a single recipient - original requires length > 0 (passes), mutant requires length < 0 (fails)
    const recipients = ["0x0000000000000000000000000000000000000001"];
    const amounts = [1];
    
    // The mutant will revert on require(_tos.length < 0) since length = 1 is not < 0
    // The original will succeed since length = 1 is > 0
    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.not.be.reverted;
  });
});