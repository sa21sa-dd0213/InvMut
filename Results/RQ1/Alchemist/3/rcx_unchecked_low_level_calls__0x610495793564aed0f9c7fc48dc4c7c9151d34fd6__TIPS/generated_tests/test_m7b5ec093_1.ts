import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant test - sendMoney revert on failure", function () {
  it("should revert when sendMoney is called with a target that rejects ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the SimpleWallet contract
    const SimpleWalletFactory = await ethers.getContractFactory("SimpleWallet");
    const wallet = await SimpleWalletFactory.deploy();
    await wallet.waitForDeployment();
    
    // Deploy a simple contract that will reject incoming ether
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the wallet with some ether so it has balance to send
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attempt to send money to the rejector contract - should revert in original, pass in mutant
    await expect(
      wallet.sendMoney(
        await rejector.getAddress(),
        ethers.parseEther("0.5"),
        "0x"
      )
    ).to.be.reverted;
  });
});